// JSHint options

/*global window:true, document:true, setTimeout:true, console:true, jQuery:true,
sylva:true, alert:true */

/****************************************************************************
 * Visualizations
 ****************************************************************************/

;(function(sylva, $, window, document, undefined) {

  var visualizations = {

    sigma: function() {
      sylva.Sigma.start();
    }

  };

  // DOM
  $(function() {

    $('#graph-node-types').hide();
    $('#sigma-wrapper').css({
      'width': $('#body').width(),
      'margin-top': '0px'
    });

    var msg = '';
    if (sylva.jsValues.isSchemaEmpty) {
      msg += gettext("Your Schema is empty.");
      msg += '<br>';
      msg += gettext("You need to define a Schema before adding data to your graph.");
    } else if (sylva.jsValues.isGraphEmpty) {
      msg += gettext("Your graph is empty.");
      msg += '<br>';
      msg += gettext("You haven't added any data to your graph yet.");
    }

    if (msg !== '') {
      // TODO: The next lines are for checking the import tools without enter in the Analytics Mode.
      // sylva.modals.init();
      // $('a[data-modal="import-schema"]').on('click', sylva.Sigma.callImportSchemaModal);
      // $('a[data-modal="import-data"]').on('click', sylva.Sigma.callImportDataModal);

      $('#sigma-container').html('<div class="graph-empty-message">' + msg + '</div>');
    } else {
      var spinnerOpts = {
        lines: 15,            // The number of lines to draw
        length: 14,           // The length of each line
        width: 5,             // The line thickness
        radius: 11,           // The radius of the inner circle
        corners: 1,           // Corner roundness (0..1)
        rotate: 0,            // The rotation offset
        color: '#000',        // #rgb or #rrggbb
        speed: 1,             // Rounds per second
        trail: 60,            // Afterglow percentage
        shadow: false,         // Whether to render a shadow
        hwaccel: false,       // Whether to use hardware acceleration
        className: 'spinner', // The CSS class to assign to the spinner
        zIndex: 2e9,          // The z-index (defaults to 2000000000)
        top: '105',           // Top position relative to parent in px
        left: '550'           // Left position relative to parent in px
      };
      var spinnerTarget = document.getElementById('spinner');
      var spinner = new Spinner(spinnerOpts).spin(spinnerTarget);

      $('#sigma-container').append('<div id="graph-loading" class="graph-loading-wrapper" style="opacity: 0.5;">' +
                                     '<div id="graph-loading-message" class="graph-loading-inner" style="top: 170px;">' +
                                      gettext('loading...') +
                                     '</div>' +
                                   '</div>');
      $('#graph-controls .right').css('display', 'inline-block');

      // Graph rendering
      var jqxhr = $.getJSON(sylva.urls.viewGraphAjax, function(data) {
        $('#graph-loading').remove();
        spinner.stop();

        // Full graph
        sylva.graph = data.graph

        // Other data
        sylva.nodetypes = data.nodetypes;
        sylva.reltypes = data.reltypes;
        sylva.nodeIds = data.nodeIds;
        sylva.size = data.size;
        sylva.collapsibles = data.collapsibles;
        sylva.positions = data.positions;
        sylva.searchLoadingImage = data.searchLoadingImage;
        sylva.queries = data.queries;

        $('#graph-support').hide();
        $('#graph-node-types').show();
        $('#sigma-wrapper').removeAttr('style');
        visualizations.sigma();

        try {
          initAnalytics(jQuery);
        } catch (error) {
          console.log('Sylva: Analytics are disabled.');
        }

        $('.sigma-control').not('.analytics-mode').css('display', 'inline-block');
        $('#sigma-node-size').css('display', 'inline-block');
        $('#sigma-graph-layout').css('display', 'inline-block');
        $('#sigma-edge-shape').css('display', 'inline-block');
      });

      // Error handling.
      jqxhr.error(function() {
        $('#graph-loading').remove();
        spinner.stop();

        $('#sigma-wrapper').width($('#body').width());

        var msg = gettext("Oops! Something went wrong with the server. Please, reload the page.");
        $('#sigma-container').html('<div class="graph-empty-message">' + msg + '</div>');
      });

    }
  });
})(sylva, jQuery, window, document);
