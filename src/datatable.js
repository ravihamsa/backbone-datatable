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
        if(column.attributes){
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
    tagName:'th',
    render:function(){
        this.$el.html(this.column.label || this.column.key);
        return this;
    }
});

var RowView = BaseView.extend({
    initialize: function (options) {
        this.columns = options.columns;
    },
    dataEvents:{
        'change':'render'
    },
    tagName: 'tr',
    render: function () {
        var _this = this;
        this.$el.empty();
        _.each(this.columns, function (column) {
            _this.$el.append(new CellView({model: _this.model,column:column}).render().el);
        });

        return this;
    }
});

var HeaderRowView = RowView.extend({
    render: function () {
        var _this = this;
        _.each(this.columns, function (column) {
            _this.$el.append(new HeaderCellView({column:column}).render().el);
        });

        return this;
    }
});


var TableView = BaseView.extend({
    tagName:'table',
    dataEvents:{
        'add':'addRowHandler',
        'remove':'removeRowHandler'
    },
    events:{
        'click td':'tdClickHandler'
    },
    initialize: function (options) {
        var config = options.config;
        this.columns = config.columns;

        this.$el.attr({
            cellpadding:0,
            cellspacing:0,
            width:'100%'
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
    renderHeaderView:function(){
        this.$el.append(new HeaderRowView({
            columns: this.columns
        }).render().el);
    },
    addRowHandler:function(event, model){
        this.addRow(model);
    },
    addRow:function(model){
        this.$el.append(new RowView({
            model: model,
            columns: this.columns
        }).render().el);
    },
    removeRowHandler:function(){
        console.log('remove row', arguments);
    },
    tdClickHandler:function(e){
        var target = $(e.currentTarget);
        var model = target.data('__cellModel__');
        var column = target.data('__columnConfig__');
        this.trigger('cellClick:'+column.key, target, model);
        this.trigger('cellClick', target, column.key, model);
    }
});



