/**
 * Created with JetBrains WebStorm.
 * User: ravi.hamsa
 * Date: 05/04/13
 * Time: 11:12 PM
 * To change this template use File | Settings | File Templates.
 */

var BaseView = Backbone.View.extend({
    constructor: function (options) {
        Backbone.View.call(this, options);
        this.bindDataEvents();
        this.bindLoadingEvents();
    },
    bindDataEvents: function () {
        if (this.model) {
            this._bindDataEvents(this.model);
        }
        if (this.collection) {
            this._bindDataEvents(this.collection);
        }
    },

    bindLoadingEvents: function () {
        var _this = this;
        if (this.model) {
            this.model.on('change:isLoading', function (model, isLoading) {
                if (isLoading) {
                    _this.showLoading();
                } else {
                    _this.hideLoading();
                }

            });
        }

    },
    _bindDataEvents: function (modelOrCollection) {
        var eventList, _this;
        _this = this;
        eventList = this.dataEvents;
        return _.each(eventList, function (handler, event) {
            var events, handlers, splitter;
            splitter = /\s+/;
            handlers = handler.split(splitter);
            events = event.split(splitter);
            return _.each(handlers, function (shandler) {
                return _.each(events, function (sevent) {
                    return modelOrCollection.on(sevent, function () {
                        if (_this[shandler]) {
                            //var debounced = _.debounce(_this[shandler], 10);
                            var args = [].slice.call(arguments);
                            args.unshift(sevent);
                            return _this[shandler].apply(_this, args);
                        } else {
                            throw shandler + ' Not Defined';
                        }
                    });
                });
            });
        });
    }
});

var BaseModel = Backbone.Model.extend({

});

var BaseCollection = Backbone.Collection.extend({

});


var RowCollection = BaseCollection.extend({
    initialize:function(data, options){
        this.sortKey = options.sortKey || _.keys(data[0])[0];
        this.sortOrder = options.sortOrder === 'asc' ? 'desc' : 'asc';
    },
    comparator: function (itemA, itemB) {
        var valueA = itemA.get(this.sortKey) || "0";
        var valueB = itemB.get(this.sortKey) || "0";
        if(this.sortOrder === 'asc'){
            return valueA > valueB;
        }else{
            return valueA < valueB;
        }

    },
    setSortKey:function(key){
        if(key === this.sortKey){
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        }else{
            this.sortKey = key;
            this.sortOrder = 'asc';
        }
        this.sort();
    }
});

var defaultFormatter = function (key, model) {
    return model.get(key);
};


var CellView = BaseView.extend({
    tagName: 'td',
    initialize: function (options) {
        var column = options.column;
        this.column = column;
        this.key = column.key;
        this.formatter = column.formatter || defaultFormatter;
        if (column.attributes) {
            this.$el.attr(column.attributes);
        }
        this.$el.data('__cellModel__', this.model);
        this.$el.data('__columnConfig__', column);
    },
    render: function () {
        this.$el.html(this.formatter.call(this, this.key, this.model));
        return this;
    }
});

var HeaderCellView = CellView.extend({
    tagName: 'th',
    render: function () {
        this.$el.html(this.column.label || this.column.key);
        return this;
    }
});

var RowView = BaseView.extend({
    initialize: function (options) {
        this.columns = options.columns;
        //this.model.view = this;
    },
    dataEvents: {
        'change': 'render'
    },
    tagName: 'tr',
    className: 'row',
    render: function () {
        var _this = this;
        this.$el.empty();
        _.each(this.columns, function (column) {
            _this.$el.append(new CellView({model: _this.model, column: column}).render().el);
        });

        return this;
    }
});

var RowDetailView = BaseView.extend({
    tagName: 'tr',
    initialize: function (options) {
        this.columns = options.columns;
        //this.model.view = this;
    },
    setModel: function (model) {
        this.model = model;
        this.render();
    },
    render: function () {
        if (this.model) {
            var td = $('<td></td>');
            td.attr({
                colspan: this.columns.length
            });
            td.html(JSON.stringify(this.model.toJSON()));
            this.$el.append(td);
        }
        return this;
    }
});

var HeaderRowView = RowView.extend({
    render: function () {
        var _this = this;
        _.each(this.columns, function (column) {
            _this.$el.append(new HeaderCellView({column: column}).render().el);
        });

        return this;
    }
});


var TableView = BaseView.extend({
    tagName: 'table',
    dataEvents: {
        'add': 'addRowHandler',
        'remove': 'removeRowHandler',
        'sort': 'sortHandler'
    },
    events: {
        'click td': 'tdClickHandler',
        'click th': 'thClickHandler',
        'click td a': 'tdAnchorClickHandler',
        'mouseenter tr.row': 'trHoverOnHandler',
        'mouseleave tr.row': 'trHoverOffHandler'
    },
    initialize: function (options) {
        var config = options.config;
        this.columns = config.columns;

        this.$el.attr({
            cellpadding: 0,
            cellspacing: 0,
            width: '100%'
        });
    },
    render: function () {
        var _this = this;
        _this.$el.empty();

        this.renderHeaderView();

        this.collection.each(function (model) {
            _this.addRow.call(_this, model);
        });

        return this;
    },
    renderHeaderView: function () {
        this.$el.append(new HeaderRowView({
            columns: this.columns
        }).render().el);
    },
    renderDetailView: function (sourceRow, model) {
        if (this.detailView) {
            this.detailView.remove();
        }
        if (this.expandedModelId === model.id) {
            delete this.expandedModelId;
            return;
        }

        var detailView = new RowDetailView({
            columns: this.columns,
            model: model
        });

        detailView.render().$el.insertAfter(sourceRow);

        this.detailView = detailView;
        this.expandedModelId = model.id;

    },
    addRowHandler: function (event, model) {
        this.addRow(model);
    },
    addRow: function (model) {
        //var index = model.collection.indexOf(model);
        //var lastIndex = this.$el.children().length;
        var view = new RowView({
            model: model,
            columns: this.columns
        });

        this.$el.append(view.render().el);
        //this.$el.append().render().el);
    },
    removeRowHandler: function () {
        console.log('remove row', arguments);
    },
    sortHandler: function () {
        //TODO:should implement index base insertion upon insert instead of re-render
        this.render();
    },
    tdClickHandler: function (e) {
        e.preventDefault();
        e.stopPropagation();
        var target = $(e.currentTarget);
        var model = target.data('__cellModel__');
        var column = target.data('__columnConfig__');
        if (model && column) {
            var eventName = 'cellClick';
            this.trigger(eventName + ':' + column.key, target, model);
            this.trigger(eventName + '', target, column.key, model);

            eventName = 'rowClick';
            this.trigger(eventName, target.closest('tr'), model);
        }

    },
    tdAnchorClickHandler: function (e) {
        e.preventDefault();
        e.stopPropagation();
        var target = $(e.currentTarget);
        var td = target.closest('td');
        var model = td.data('__cellModel__');
        var column = td.data('__columnConfig__');
        if (model && column) {
            var eventName = 'anchorClick';
            this.trigger(eventName + ':' + column.key, target, model);
            this.trigger(eventName + '', target, column.key, model);
        }
    },
    thClickHandler:function(e){
        e.preventDefault();
        e.stopPropagation();
        var target = $(e.currentTarget);
        var column = target.data('__columnConfig__');
        if (column) {
            var eventName = 'headerCellClick';
            this.trigger(eventName + ':' + column.key, target, column);
            this.trigger(eventName + '', target, column.key, column);
            this.collection.setSortKey(column.key);
        }
    },
    trHoverOnHandler: function (e) {
        var target = $(e.currentTarget);
        target.addClass('hover');
    },
    trHoverOffHandler: function (e) {
        var target = $(e.currentTarget);
        target.removeClass('hover');
    }
});



